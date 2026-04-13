<?php
declare(strict_types=1);

namespace Herqua\Schoenadviseur\Test\Unit\Controller\Adminhtml\Mapping;

use Herqua\Schoenadviseur\Controller\Adminhtml\Mapping\Save;
use Herqua\Schoenadviseur\Model\FieldMapping;
use Magento\Backend\App\Action\Context;
use Magento\Framework\App\RequestInterface;
use Magento\Framework\Controller\Result\Redirect;
use Magento\Framework\Controller\Result\RedirectFactory;
use Magento\Framework\Message\ManagerInterface;
use PHPUnit\Framework\TestCase;

final class SaveTest extends TestCase
{
    public function testSavesMappingFromPost(): void
    {
        $fieldMapping = $this->createMock(FieldMapping::class);
        $fieldMapping->expects($this->once())->method('save')
            ->with(['stabiliteit' => 'herqua_stab', 'drop' => 'herqua_drop_mm']);

        $request = $this->createMock(RequestInterface::class);
        $request->method('getParam')->with('mapping')->willReturn([
            'stabiliteit' => 'herqua_stab',
            'drop' => 'herqua_drop_mm',
        ]);

        $messages = $this->createMock(ManagerInterface::class);
        $messages->expects($this->once())->method('addSuccessMessage');

        $redirect = $this->createMock(Redirect::class);
        $redirect->method('setPath')->willReturnSelf();
        $redirectFactory = $this->createMock(RedirectFactory::class);
        $redirectFactory->method('create')->willReturn($redirect);

        $context = $this->createMock(Context::class);
        $context->method('getRequest')->willReturn($request);
        $context->method('getMessageManager')->willReturn($messages);
        $context->method('getResultRedirectFactory')->willReturn($redirectFactory);

        (new Save($context, $fieldMapping))->execute();
    }

    public function testIgnoresNonArrayPost(): void
    {
        $fieldMapping = $this->createMock(FieldMapping::class);
        $fieldMapping->expects($this->never())->method('save');

        $request = $this->createMock(RequestInterface::class);
        $request->method('getParam')->willReturn(null);

        $messages = $this->createMock(ManagerInterface::class);
        $messages->expects($this->once())->method('addErrorMessage');

        $redirect = $this->createMock(Redirect::class);
        $redirect->method('setPath')->willReturnSelf();
        $redirectFactory = $this->createMock(RedirectFactory::class);
        $redirectFactory->method('create')->willReturn($redirect);

        $context = $this->createMock(Context::class);
        $context->method('getRequest')->willReturn($request);
        $context->method('getMessageManager')->willReturn($messages);
        $context->method('getResultRedirectFactory')->willReturn($redirectFactory);

        (new Save($context, $fieldMapping))->execute();
    }
}
