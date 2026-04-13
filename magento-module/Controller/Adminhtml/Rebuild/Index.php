<?php
declare(strict_types=1);

namespace Herqua\Schoenadviseur\Controller\Adminhtml\Rebuild;

use Herqua\Schoenadviseur\Model\DirtyFlag;
use Herqua\Schoenadviseur\Model\ProductExporter;
use Magento\Backend\App\Action;
use Magento\Backend\App\Action\Context;
use Magento\Framework\Controller\Result\Redirect;

class Index extends Action
{
    public const ADMIN_RESOURCE = 'Herqua_Schoenadviseur::rebuild';

    public function __construct(
        Context $context,
        private readonly ProductExporter $exporter,
        private readonly DirtyFlag $dirtyFlag
    ) {
        parent::__construct($context);
    }

    public function execute(): Redirect
    {
        try {
            $count = $this->exporter->rebuild();
            $this->dirtyFlag->clear();
            $this->messageManager->addSuccessMessage(
                (string)__('Herqua products.json rebuilt: %1 products', $count)
            );
        } catch (\Throwable $e) {
            $this->messageManager->addErrorMessage(
                (string)__('Rebuild failed: %1', $e->getMessage())
            );
        }

        $redirect = $this->resultRedirectFactory->create();
        $redirect->setPath('adminhtml/system_config/edit/section/herqua_schoenadviseur');
        return $redirect;
    }
}
