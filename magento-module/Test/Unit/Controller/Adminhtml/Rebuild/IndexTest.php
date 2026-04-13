<?php
declare(strict_types=1);

namespace Herqua\Schoenadviseur\Test\Unit\Controller\Adminhtml\Rebuild;

use Herqua\Schoenadviseur\Controller\Adminhtml\Rebuild\Index;
use Herqua\Schoenadviseur\Model\DirtyFlag;
use Herqua\Schoenadviseur\Model\ProductExporter;
use Magento\Backend\App\Action\Context;
use Magento\Framework\App\RequestInterface;
use Magento\Framework\Controller\Result\Redirect;
use Magento\Framework\Controller\Result\RedirectFactory;
use Magento\Framework\Message\ManagerInterface;
use PHPUnit\Framework\TestCase;

final class IndexTest extends TestCase
{
    public function testAddsSuccessMessageAndRedirects(): void
    {
        $exporter = $this->createMock(ProductExporter::class);
        $exporter->method('rebuild')->willReturn(17);

        $dirtyFlag = $this->createMock(DirtyFlag::class);
        $dirtyFlag->expects($this->once())->method('clear');

        $messages = $this->createMock(ManagerInterface::class);
        $messages->expects($this->once())->method('addSuccessMessage')
            ->with($this->stringContains('17'));

        $redirect = $this->createMock(Redirect::class);
        $redirect->expects($this->once())->method('setPath')->with('adminhtml/system_config/edit/section/herqua_schoenadviseur');

        $redirectFactory = $this->createMock(RedirectFactory::class);
        $redirectFactory->method('create')->willReturn($redirect);

        $context = $this->createMock(Context::class);
        $context->method('getMessageManager')->willReturn($messages);
        $context->method('getResultRedirectFactory')->willReturn($redirectFactory);
        $context->method('getRequest')->willReturn($this->createMock(RequestInterface::class));

        (new Index($context, $exporter, $dirtyFlag))->execute();
    }

    public function testAddsErrorOnException(): void
    {
        $exporter = $this->createMock(ProductExporter::class);
        $exporter->method('rebuild')->willThrowException(new \RuntimeException('boom'));

        $dirtyFlag = $this->createMock(DirtyFlag::class);
        $dirtyFlag->expects($this->never())->method('clear');

        $messages = $this->createMock(ManagerInterface::class);
        $messages->expects($this->once())->method('addErrorMessage')->with($this->stringContains('boom'));

        $redirect = $this->createMock(Redirect::class);
        $redirect->method('setPath')->willReturnSelf();
        $redirectFactory = $this->createMock(RedirectFactory::class);
        $redirectFactory->method('create')->willReturn($redirect);

        $context = $this->createMock(Context::class);
        $context->method('getMessageManager')->willReturn($messages);
        $context->method('getResultRedirectFactory')->willReturn($redirectFactory);
        $context->method('getRequest')->willReturn($this->createMock(RequestInterface::class));

        (new Index($context, $exporter, $dirtyFlag))->execute();
    }
}
